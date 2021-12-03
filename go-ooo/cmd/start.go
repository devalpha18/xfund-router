package cmd

import (
	"errors"
	"fmt"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go-ooo/app"
	"os"
)

// startCmd represents the start command
var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Start the OoO service",
	Long: `Start the OoO service, which will listen for requests and process them.
Service will start with the default home path $HOME/.go-ooo and expects the configuration
files and keystore to exist. 

If you have not run this before, begin by running the 'go-ooo init' command to initialise
the configuration.

The --home path can be specified.
The --pass flag can also be used to pass the location of the file containing your
keystore password, or the password itself.

Examples:

  go-ooo start
  go-ooo start --home=/home/user/some-other-go-ooo
  go-ooo start --home=/home/user/some-other-go-ooo --pass=/path/to/pass.txt
`,
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		if _, err := os.Stat(viper.ConfigFileUsed()); errors.Is(err, os.ErrNotExist) {
			fmt.Println(viper.ConfigFileUsed(), "does not exist. please run 'go-ooo init'")
			os.Exit(1)
		}
	},
	Run: func(cmd *cobra.Command, args []string) {
		server, err := app.NewServer(keystorePass)
		if err != nil {
			panic(err)
		}
		server.InitServer()
		server.Run()
	},
}

func init() {
	startCmd.PersistentFlags().StringVar(&keystorePass, "pass", "", "keystore password or password file location")
	rootCmd.AddCommand(startCmd)
}
