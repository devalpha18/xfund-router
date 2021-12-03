package cmd

import (
	"errors"
	"fmt"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go-ooo/version"
	"os"
)

// startCmd represents the start command
var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Displays the current app version info",
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		if _, err := os.Stat(viper.ConfigFileUsed()); errors.Is(err, os.ErrNotExist) {
			fmt.Println(viper.ConfigFileUsed(), "does not exist. please run 'go-ooo init'")
			os.Exit(1)
		}
	},
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(version.NewInfo())
		return
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// startCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// startCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
