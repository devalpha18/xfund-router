package database

/*
  Migrations
*/

// Schema V0 to V1

func (d *DB) MigrateV0ToV1() {
	dbVers, _ := d.getCurrentDbSchemaVersion()
	if dbVers.CurrentVersion == 0 {
		d.V0ToV1DeleteAdhocTokenData()
		_ = d.setDbSchemaVersion(1)
	}
}

// V0ToV1DeleteAdhocTokenData is used when migrating from Db v0 to v1
func (d *DB) V0ToV1DeleteAdhocTokenData() {
	d.Exec("DELETE FROM dex_pairs")
	d.Exec("DELETE FROM dex_tokens")
	d.Exec("DELETE FROM token_contracts")
}
