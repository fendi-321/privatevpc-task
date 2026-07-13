# Source outputs from the Perimeter stack's local state
# This removes the need to manually input tgw_id and perimeter_vpc_cidr

data "terraform_remote_state" "perimeter" {
  backend = "local"

  config = {
    # Path relative to this DevOps module to the Perimeter state file
    # Using backup state for plan-only since current state has no outputs
    path = "${path.module}/../Perimeter/terraform.tfstate.backup"
  }
}
