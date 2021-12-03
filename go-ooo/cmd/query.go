package cmd

import (
	"fmt"
	"github.com/spf13/cobra"
)

// queryCmd represents the query command
var queryCmd = &cobra.Command{
	Use:   "query",
	Short: "Run a sub-command",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("run one of the sub-commands. See 'go-ooo admin --help'")
	},
}

func init() {
	rootCmd.AddCommand(queryCmd)
}
