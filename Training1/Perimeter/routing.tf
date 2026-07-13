# vpc-perimeter routing
resource "aws_route" "perimeter_public_igw" {
  route_table_id         = module.ingress_subnet.route_table_id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

resource "aws_route" "perimeter_private_nat" {
  route_table_id         = module.egress_subnet.route_table_id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.nat.id
}
