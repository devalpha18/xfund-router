package version

// At build time, the variables Name, Version, Commit, and Binary
// can be passed as build flags as shown in the following example:
//
//  go build -X go-ooo/version.Version=1.0.0 \
//		  -X go-ooo/version.Commit=abcd1234...
import (
	"fmt"
	"runtime"
)

var (
	Name    = "OoO Oracle"
	Binary  = "go-ooo"
	Version = "0.0.1"
	Commit  = ""
)

type Info struct {
	Name      string
	Binary    string
	Version   string
	GitCommit string
	GoVersion string
}

func NewInfo() Info {
	return Info{
		Name:      Name,
		Binary:    Binary,
		Version:   Version,
		GitCommit: Commit,
		GoVersion: fmt.Sprintf("go version %s %s/%s", runtime.Version(), runtime.GOOS, runtime.GOARCH),
	}
}

func (vi Info) String() string {
	return fmt.Sprintf(`%s v%s
binary: %s
git commit: %s
%s`,
		vi.Name, vi.Version, vi.Binary, vi.GitCommit, vi.GoVersion,
	)
}

func (vi Info) StringLine() string {
	return fmt.Sprintf("%s v%s. git commit: %s. %s", vi.Name, vi.Version, vi.GitCommit, vi.GoVersion)
}
