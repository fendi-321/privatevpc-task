module "vpc_perimeter" {
  source     = "../modules/vpc"
  vpc_name   = "vpc-perimeter"
  cidr_block = "100.125.100.0/24"
}

module "ingress_subnet" {
  source      = "../modules/subnet"
  vpc_id      = module.vpc_perimeter.vpc_id
  subnet_name = "ingress"
  cidr_block  = "100.125.100.0/27"
}

module "egress_subnet" {
  source      = "../modules/subnet"
  vpc_id      = module.vpc_perimeter.vpc_id
  subnet_name = "egress"
  cidr_block  = "100.125.100.32/27"
}

module "inspection_subnet" {
  source      = "../modules/subnet"
  vpc_id      = module.vpc_perimeter.vpc_id
  subnet_name = "inspection"
  cidr_block  = "100.125.100.64/27"
}

module "tgwa_perimeter_subnet" {
  source      = "../modules/subnet"
  vpc_id      = module.vpc_perimeter.vpc_id
  subnet_name = "tgwa-perimeter"
  cidr_block  = "100.125.100.240/28"
}
