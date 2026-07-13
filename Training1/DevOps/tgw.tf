# TGW attachment for vpc-devops
resource "aws_ec2_transit_gateway_vpc_attachment" "devops" {
  subnet_ids         = [module.tgwa_devops_subnet.subnet_id]
  transit_gateway_id = data.terraform_remote_state.perimeter.outputs.tgw_id
  vpc_id             = module.vpc_devops.vpc_id

  tags = {
    Name = "tgw-attachment-devops"
  }
}
