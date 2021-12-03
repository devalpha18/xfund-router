package cmd

import (
	"github.com/spf13/cobra"
	go_ooo_types "go-ooo/types"
)

// setFeeCmd represents the setFee command
var queryFeesCmd = &cobra.Command{
	Use:   "fees",
	Short: "Query your global fees",
	Run: func(cmd *cobra.Command, args []string) {
		adminTask := go_ooo_types.AdminTask{}

		adminTask.Task = "query_fees"

		processAdminTask(adminTask)
	},
}

func init() {
	queryCmd.AddCommand(queryFeesCmd)
}
