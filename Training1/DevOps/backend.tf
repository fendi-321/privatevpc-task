# ---------------------------------------------------------------------------
# Remote state backend: S3 with native state locking
# ---------------------------------------------------------------------------
# The DevOps stack is the spoke; it is applied after the Perimeter stack and
# must read the Transit Gateway ID from it, so both stacks share one backend.
#
# Locking uses the S3-native lockfile (`<key>.tflock` object) rather than a
# DynamoDB table - `dynamodb_table` is deprecated in Terraform >= 1.10.
#
# Override any value per environment at init time, e.g.
#   terraform init -backend-config="bucket=<other-state-bucket>"
terraform {
  backend "s3" {
    bucket       = "privatevpc-task-tfstate-114030601209"
    key          = "devops/terraform.tfstate"
    region       = "ap-southeast-1"
    encrypt      = true
    use_lockfile = true
  }
}

