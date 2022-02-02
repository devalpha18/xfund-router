package cmd

import (
	go_ooo_types "go-ooo/types"
	"strconv"

	"github.com/spf13/cobra"
)

// withdrawCmd represents the withdraw command
var withdrawCmd = &cobra.Command{
	Use:   "withdraw <amount> <recipient>",
	Short: "Withdraw available fees from the Router",
	Long: `Allows you to withdraw your accumulated fees from the Router. You can set the
recipient to an address other than your oracle provider address.

Examples:

  go-ooo admin withdraw 100000000 0x1234556abcd...

`,
	Args: cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		adminTask := go_ooo_types.AdminTask{}

		amount, _ := strconv.ParseInt(args[0], 10, 64)
		recipient := args[1]
		adminTask.Task = "withdraw"
		adminTask.FeeOrAmount = uint64(amount)
		adminTask.ToOrConsumer = recipient

		processAdminTask(adminTask)
	},
}

func init() {
	adminCmd.AddCommand(withdrawCmd)
}
