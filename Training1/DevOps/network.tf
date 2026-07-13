module "vpc_devops" {
  source     = "../modules/vpc"
  vpc_name   = "vpc-devops"
  cidr_block = "100.126.100.0/24"
}

module "devops_subnet" {
  source      = "../modules/subnet"
  vpc_id      = module.vpc_devops.vpc_id
  subnet_name = "devops"
  cidr_block  = "100.126.100.0/27"
}

module "tgwa_devops_subnet" {
  source      = "../modules/subnet"
  vpc_id      = module.vpc_devops.vpc_id
  subnet_name = "tgwa-devops"
  cidr_block  = "100.126.100.240/28"
}
