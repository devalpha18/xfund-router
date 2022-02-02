package cmd

import (
	"github.com/spf13/cobra"
	go_ooo_types "go-ooo/types"
)

// setFeeCmd represents the setFee command
var queryGranularFeesCmd = &cobra.Command{
	Use:   "granularFees <consumer_address>",
	Short: "Query fees for a given consumer address",
	Long: `Query fees for a the specified consumer. This allows
you to have fine-grained control over your fees, and allows you to charge more or less for
individual data consumer contracts when used with the 'go-ooo admin setGranularFee' command.

Examples:

  go-ooo query granularFees 0x12345abcde...
`,
	Args: cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		adminTask := go_ooo_types.AdminTask{}

		consumer := args[0]

		adminTask.Task = "query_granular_fees"
		adminTask.ToOrConsumer = consumer

		processAdminTask(adminTask)
	},
}

func init() {
	queryCmd.AddCommand(queryGranularFeesCmd)
}
