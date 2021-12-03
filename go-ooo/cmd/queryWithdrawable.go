package cmd

import (
	"github.com/spf13/cobra"
	go_ooo_types "go-ooo/types"
)

// setFeeCmd represents the setFee command
var queryWithdrawableCmd = &cobra.Command{
	Use:   "withdrawable",
	Short: "Query amount available to withdraw",
	Run: func(cmd *cobra.Command, args []string) {
		adminTask := go_ooo_types.AdminTask{}

		adminTask.Task = "query_withdrawable"

		processAdminTask(adminTask)
	},
}

func init() {
	queryCmd.AddCommand(queryWithdrawableCmd)
}
