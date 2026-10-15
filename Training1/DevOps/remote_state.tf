# Source outputs from the Perimeter stack's remote state.
# This removes the need to manually input tgw_id and perimeter_vpc_cidr, and it
# works on a fresh CI checkout - unlike the previous `backend = "local"` lookup
# of ../Perimeter/terraform.tfstate.backup, which only ever existed on the
# machine that ran `terraform apply` in the Perimeter stack.

data "terraform_remote_state" "perimeter" {
  backend = "s3"

  config = {
    bucket  = "privatevpc-task-tfstate-114030601209"
    key     = "perimeter/terraform.tfstate"
    region  = "ap-southeast-1"
    encrypt = true
  }
}

