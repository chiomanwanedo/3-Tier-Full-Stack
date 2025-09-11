terraform {
  backend "s3" {
    bucket         = "tfstate-160885250122-prod"
    key            = "infra/prod/terraform.tfstate"
    region         = "eu-west-2"
    dynamodb_table = "tfstate-locks-prod"
    encrypt        = true
  }
}
