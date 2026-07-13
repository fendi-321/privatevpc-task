# Transit Gateway
resource "aws_ec2_transit_gateway" "tgw" {
  description = "Transit Gateway for devops and perimeter VPCs"

  tags = {
    Name = "main-tgw"
  }
}

# TGW attachment for vpc-perimeter
resource "aws_ec2_transit_gateway_vpc_attachment" "perimeter" {
  subnet_ids         = [module.tgwa_perimeter_subnet.subnet_id]
  transit_gateway_id = aws_ec2_transit_gateway.tgw.id
  vpc_id             = module.vpc_perimeter.vpc_id

  tags = {
    Name = "tgw-attachment-perimeter"
  }
}
