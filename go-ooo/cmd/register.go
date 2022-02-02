package cmd

import (
	go_ooo_types "go-ooo/types"
	"strconv"

	"github.com/spf13/cobra"
)

// registerCmd represents the register command
var registerCmd = &cobra.Command{
	Use:   "register <fee>",
	Short: "Register as a new OoO data provider",
	Long: `Register your wallet as a new OoO data provider.

You must specify a global fee, and this must be 10 ^ 9. For example, 0.01 xFUND will be:

  10000000

Examples:

  go-ooo admin register 1000000
`,
	Args: cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		adminTask := go_ooo_types.AdminTask{}

		fee, _ := strconv.ParseInt(args[0], 10, 64)
		adminTask.Task = "register"
		adminTask.FeeOrAmount = uint64(fee)

		processAdminTask(adminTask)
	},
}

func init() {
	adminCmd.AddCommand(registerCmd)

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// registerCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// registerCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
