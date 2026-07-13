# vpc-devops routing
resource "aws_route" "devops_private_tgw" {
  route_table_id         = module.devops_subnet.route_table_id
  destination_cidr_block = "0.0.0.0/0"
  transit_gateway_id     = data.terraform_remote_state.perimeter.outputs.tgw_id
}

resource "aws_route" "devops_tgw_perimeter" {
  route_table_id         = module.tgwa_devops_subnet.route_table_id
  destination_cidr_block = data.terraform_remote_state.perimeter.outputs.perimeter_vpc_cidr
  transit_gateway_id     = data.terraform_remote_state.perimeter.outputs.tgw_id
}
