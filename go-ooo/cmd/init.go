package cmd

import (
	"errors"
	"fmt"
	"github.com/ethereum/go-ethereum/common"
	"github.com/spf13/viper"
	"go-ooo/config"
	"go-ooo/keystore"
	"go-ooo/utils"
	"go-ooo/utils/walletworker"
	"os"

	"github.com/spf13/cobra"
)

// startCmd represents the start command
var initCmd = &cobra.Command{
	Use:   "init <network>",
	Short: "Initialise your OoO service",
	Long: `Initialise your OoO service with some default configuration values.

The command will initialise the config.toml file according to the given network option, and
also your keystore. You can generate a new key, or import an existing private key hex string,
and will be prompted to do so during the process.

By default, the environment will use $HOME/.go-ooo to store the app's configuration. You can
specify where to store these files with the --home flag.

Once initialised, you must edit the config.toml file with the appropriate values for your
database configuration, Eth RPC URLs etc.

Current network options are:

  dev
  rinkeby
  mainnet

Examples:

  go-ooo init rinkeby
  go-ooo init dev --home=/path/to/go-ooo-home

`,
	Args: cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		network := args[0]
		fmt.Println("init called")
		fmt.Println("appHomePath", appHomePath)
		fmt.Println("cfg", viper.ConfigFileUsed())

		if _, err := os.Stat(viper.ConfigFileUsed()); errors.Is(err, os.ErrNotExist) {
			fmt.Println(viper.ConfigFileUsed(), "does not exist. Creating with defaults")

			if _, err := os.Stat(appHomePath); errors.Is(err, os.ErrNotExist) {
				err := os.MkdirAll(appHomePath, os.ModePerm)
				if err != nil {
					panic(err)
				}
			}

			switch network {
			case "rinkeby":
				initForRinkeby()
				break
			case "mainnet":
				initForMainnet()
				break
			case "polygon":
				initForPolygon()
				break
			case "dev":
				initForDevnet()
				break
			default:
				initForDevnet()
				break
			}

			ks, _ := keystore.NewKeyStorageNoLogger(keyStorePath)

			err, ksUser := initNewKeystore(ks)
			if err != nil {
				panic(err)
			}

			viper.SetDefault(config.JobsOooApiUrl, "https://crypto.finchains.io/api")
			viper.SetDefault(config.ServeHost, "127.0.0.1")
			viper.SetDefault(config.ServePort, "8445")
			viper.SetDefault(config.KeystorageFile, keyStorePath)
			viper.SetDefault(config.KeystorageAccount, ksUser)
			viper.SetDefault(config.ChainGasLimit, 500000)
			viper.SetDefault(config.ChainMaxGasPrice, 150)
			viper.SetDefault(config.JobsCheckDuration, 5)
			viper.SetDefault(config.JobsWaitConfirmations, 2)

			viper.SetDefault(config.DatabaseDialect, "sqlite")
			viper.SetDefault(config.DatabaseStorage, dbPath)
			viper.SetDefault(config.DatabaseHost, "localhost")
			viper.SetDefault(config.DatabasePort, 5432)
			viper.SetDefault(config.DatabaseUser, "")
			viper.SetDefault(config.DatabasePassword, "")
			viper.SetDefault(config.DatabaseDatabase, "")

			viper.SetDefault(config.PrometheusPort, "9000")

			viper.SetDefault(config.LogLevel, "info")

			err = viper.SafeWriteConfigAs(viper.ConfigFileUsed())
			if err != nil {
				panic(err)
			}
		} else {
			fmt.Println(viper.ConfigFileUsed(), "already exists. Exiting")
			return
		}
	},
}

func init() {
	rootCmd.AddCommand(initCmd)
}

func initForRinkeby() {
	viper.SetDefault(config.ChainContractAddress, "0x05AB63BeC9CfC3897a20dE62f5f812de10301FDf")
	viper.SetDefault(config.ChainEthHttpHost, "")
	viper.SetDefault(config.ChainEthWsHost, "")
	viper.SetDefault(config.ChainNetworkId, 4)
	viper.SetDefault(config.ChainFirstBlock, 8456980)
}

func initForMainnet() {
	viper.SetDefault(config.ChainContractAddress, "0x9ac9AE20a17779c17b069b48A8788e3455fC6121")
	viper.SetDefault(config.ChainEthHttpHost, "")
	viper.SetDefault(config.ChainEthWsHost, "")
	viper.SetDefault(config.ChainNetworkId, 1)
	viper.SetDefault(config.ChainFirstBlock, 12728316)
}

func initForPolygon() {
	viper.SetDefault(config.ChainContractAddress, "0x5E9405888255C142207Ab692C72A8cd6fc85C3A2")
	viper.SetDefault(config.ChainEthHttpHost, "")
	viper.SetDefault(config.ChainEthWsHost, "")
	viper.SetDefault(config.ChainNetworkId, 137)
	viper.SetDefault(config.ChainFirstBlock, 24460663)
}

func initForDevnet() {
	viper.SetDefault(config.ChainContractAddress, "0x5b1869D9A4C187F2EAa108f3062412ecf0526b24")
	viper.SetDefault(config.ChainEthHttpHost, "http://127.0.0.1:8545")
	viper.SetDefault(config.ChainEthWsHost, "ws://127.0.0.1:8545")
	viper.SetDefault(config.ChainNetworkId, 696969)
	viper.SetDefault(config.ChainFirstBlock, 1)
}

func initNewKeystore(ks *keystore.Keystorage) (err error, addusername string) {
	var walletAddress common.Address
	var addgenerate string
	var privateKey string

	token, err := ks.GenerateToken()
	if err != nil {
		fmt.Println(err.Error())
		return
	}

	fmt.Println("")
	fmt.Println("Import a private key or create a new account")
	fmt.Print("Username: ")

	fmt.Scanf("%s\n", &addusername)

	if ks.ExistsByUsername(addusername) {
		fmt.Println("This account name is already used")
		initNewKeystore(ks)
	} else if addusername == "" {
		fmt.Println("Please enter account username.")
		initNewKeystore(ks)
	}
	fmt.Println("")
	fmt.Println("Do you want to add an existing private key or generate a new one?")
	fmt.Print("[ 1-import private key; 2-generate new key ]:	")

	fmt.Scanf("%s\n", &addgenerate)

	switch addgenerate {
	case "1":
		fmt.Println("")
		fmt.Print("Input your private key: ")

		fmt.Scanf("%s\n", &privateKey)

		if !utils.HasHexPrefix(privateKey) {
			privateKey = utils.AddHexPrefix(privateKey)
		}

		err = ks.AddExisting(addusername, privateKey)
		if err != nil {
			fmt.Println(err.Error())
			return
		}
		fmt.Println("\nSuccessfully imported private key!")
	case "2":
		privateKey, err = ks.GeneratePrivate(addusername)
		if err != nil {
			fmt.Println(err.Error())
			return
		}
		fmt.Println("\nSuccessfully generated a new private key:")

		if !utils.HasHexPrefix(privateKey) {
			privateKey = utils.AddHexPrefix(privateKey)
		}

		fmt.Println(privateKey)
	default:
		fmt.Println("eh?")
		err, _ = initNewKeystore(ks)
	}

	fmt.Print("Your keystore decryption & admin password:")
	fmt.Println("")
	fmt.Println(token)
	fmt.Println("")
	fmt.Println("KEEP THIS KEY SAFE! You will need it to run the application and admin tasks!")
	fmt.Println("")
	fmt.Println("Your oracle wallet address:")
	walletAddress, err = walletworker.AddressFromPrivateKeyString(privateKey)
	if err != nil {
		fmt.Println(err.Error())
		return
	}
	fmt.Println(walletAddress.Hex())
	fmt.Println("Keystore saved to:")
	fmt.Println(keyStorePath)

	return
}
