resource "aws_subnet" "main" {
  vpc_id     = var.vpc_id
  cidr_block = var.cidr_block

  tags = {
    Name = var.subnet_name
  }
}

module "rt" {
  source           = "../rt"
  vpc_id           = var.vpc_id
  subnet_id        = aws_subnet.main.id
  route_table_name = "${var.subnet_name}-rt"
}

module "nacl" {
  source    = "../nacl"
  vpc_id    = var.vpc_id
  subnet_id = aws_subnet.main.id
  nacl_name = "${var.subnet_name}-nacl"
}
