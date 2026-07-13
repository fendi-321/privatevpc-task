// Variables were previously used for tgw_id and perimeter_vpc_cidr.
// We now source these values directly from the Perimeter stack via
// data.terraform_remote_state.perimeter outputs in remote_state.tf.
// This avoids interactive prompts and keeps environments consistent.
