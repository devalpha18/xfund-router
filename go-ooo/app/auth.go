package app


import (
	"fmt"
	"io/ioutil"
	"os"
	"strings"
)

func (s *Server) inputKey() (err error) {
	fmt.Println("")
	fmt.Println("Please enter the cli/HTTP key, which was provided to you by Oracle")
	fmt.Print("Key: ")
	var key string
	fmt.Scanf("%s\n", &key)
	err = s.keystore.CheckToken(key)
	if err == nil {
		fmt.Println("Okay, let's continue...")
		return
	} else {
		fmt.Println("I'm not sure I can decrypt your keystore with this key.")
		err = s.inputKey()
		return
	}
	return
}

func (s *Server) auth() (err error) {
	fmt.Println("")
	fmt.Println("Let's verify it's you")
	err = s.inputKey()
	return
}

func getPasswordFromFileOrFlag(flagValue string) string {
	file, err := os.Open(flagValue)
	password := ""
	if err != nil {
		password = flagValue
	}

	defer file.Close()

	data, err := ioutil.ReadAll(file)
	if err == nil {
		password = string(data)
	}

	return strings.TrimSpace(password)
}

