# Internet Gateway for vpc-perimeter
resource "aws_internet_gateway" "igw" {
  vpc_id = module.vpc_perimeter.vpc_id

  tags = {
    Name = "perimeter-igw"
  }
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"
  tags = {
    Name = "perimeter-nat-eip"
  }
}

# NAT Gateway in the egress subnet
resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = module.egress_subnet.subnet_id

  tags = {
    Name = "perimeter-nat-gw"
  }

  depends_on = [aws_internet_gateway.igw]
}
