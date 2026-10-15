# ---------------------------------------------------------------------------
# Remote state backend: S3 with native state locking
# ---------------------------------------------------------------------------
# State used to live on the local disk, which breaks on any hosted CI runner:
# a runner starts from a clean checkout, so there is no state file to read and
# no lock to prevent two pipelines writing at the same time.
#
# The bucket below is versioned, AES256 encrypted and private (all public
# access blocked). Locking uses the S3-native lockfile
# (`<key>.tflock` object) rather than a DynamoDB table - `dynamodb_table` is
# deprecated in Terraform >= 1.10, so this keeps `terraform init` warning-free.
#
# Override any value per environment at init time, e.g.
#   terraform init -backend-config="bucket=<other-state-bucket>"
terraform {
  backend "s3" {
    bucket       = "privatevpc-task-tfstate-114030601209"
    key          = "perimeter/terraform.tfstate"
    region       = "ap-southeast-1"
    encrypt      = true
    use_lockfile = true
  }
}

