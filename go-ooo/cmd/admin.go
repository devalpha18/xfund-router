package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/spf13/viper"
	"go-ooo/config"
	go_ooo_types "go-ooo/types"
	"io/ioutil"
	"net/http"
	"strings"
	"syscall"

	"github.com/spf13/cobra"
	"golang.org/x/term"
)

// adminCmd represents the admin command
var adminCmd = &cobra.Command{
	Use:   "admin",
	Short: "Run a sub-command",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("run one of the sub-commands. See 'go-ooo admin --help'")
	},
}

func init() {
	rootCmd.AddCommand(adminCmd)
}

func processAdminTask(adminTask go_ooo_types.AdminTask) {

	fmt.Print("Enter your password:	")

	bytePassword, err := term.ReadPassword(int(syscall.Stdin))
	if err != nil {
		fmt.Println(err.Error())
		return
	}

	pass := strings.TrimSpace(string(bytePassword))

	fmt.Println("")
	fmt.Println("attempting to send task", adminTask.Task)
	fmt.Println("")

	requestJSON, err := json.Marshal(adminTask)
	if err != nil {
		fmt.Println("Can't marshal request")
		return
	}
	request := bytes.NewBuffer(requestJSON)
	url := fmt.Sprintf("http://%s:%d", viper.GetString(config.ServeHost), viper.GetInt(config.ServePort))

	req, err := http.NewRequest("POST", fmt.Sprint(url, "/admin"), request)

	bearer := "Bearer " + pass
	req.Header.Add("Authorization", bearer)

	client := &http.Client{}
	resp, err := client.Do(req)

	if err != nil {
		fmt.Println("Something went wrong.")
		fmt.Println(err.Error())
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		fmt.Println(err.Error())
		return
	}

	if resp.StatusCode == 200 {

		var decodedResponse go_ooo_types.AdminTaskResponse
		err = json.Unmarshal(body, &decodedResponse)
		if err != nil {
			fmt.Println(err.Error())
			return
		}

		fmt.Println("Task    :", decodedResponse.Task)
		fmt.Println("Success :", decodedResponse.Success)
		if decodedResponse.Success {
			fmt.Println("Result  :", decodedResponse.Result)
		} else {
			fmt.Println("Error   :", decodedResponse.Error)
		}
	} else {
		fmt.Println("Error   :", resp.Status)
		fmt.Println("Message :", string(body))
	}

	return
}