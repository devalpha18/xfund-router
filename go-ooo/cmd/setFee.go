package cmd

import (
	go_ooo_types "go-ooo/types"
	"strconv"

	"github.com/spf13/cobra"
)

// setFeeCmd represents the setFee command
var setFeeCmd = &cobra.Command{
	Use:   "setFee <fee>",
	Short: "Set a new global fee",
	Long: `Specify a new global fee for your provider

You must specify a global fee, and this must be 10 ^ 9. For example, 0.01 xFUND will be:

  10000000

Examples:

  go-ooo admin setFee 1000000`,
	Args: cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		adminTask := go_ooo_types.AdminTask{}

		fee, _ := strconv.ParseInt(args[0], 10, 64)
		adminTask.Task = "set_fee"
		adminTask.FeeOrAmount = uint64(fee)

		processAdminTask(adminTask)
	},
}

func init() {
	adminCmd.AddCommand(setFeeCmd)
}
