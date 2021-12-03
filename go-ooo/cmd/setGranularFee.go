package cmd

import (
	go_ooo_types "go-ooo/types"
	"strconv"

	"github.com/spf13/cobra"
)

// setGranularFeeCmd represents the setGranularFee command
var setGranularFeeCmd = &cobra.Command{
	Use:   "setGranularFee <fee> <consumer_address>",
	Short: "Set a granular fee for a consumer",
	Long: `Specify a new granular level fee for the specified consumer. This allows
you to have fine-grained control over your fees, and allows you to charge more or less for
individual data consumer contracts.

You must specify a global fee, and this must be 10 ^ 9. For example, 0.01 xFUND will be:

  10000000

Examples:

  go-ooo admin setGranularFee 1000000 0x12345abcde...`,
	Args: cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		adminTask := go_ooo_types.AdminTask{}

		fee, _ := strconv.ParseInt(args[0], 10, 64)
		consumer := args[1]
		adminTask.Task = "set_granular_fee"
		adminTask.FeeOrAmount = uint64(fee)
		adminTask.ToOrConsumer = consumer

		processAdminTask(adminTask)
	},
}

func init() {
	adminCmd.AddCommand(setGranularFeeCmd)
}
