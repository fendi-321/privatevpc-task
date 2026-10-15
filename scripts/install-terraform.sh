#!/usr/bin/env sh
# ---------------------------------------------------------------------------
# Install the pinned Terraform CLI on any Linux/macOS CI runner.
# Used by azure-pipelines.yml and buildspec.yml so every platform runs the
# exact same CLI version as the local workstation (1.15.8) and as the pin in
# Training1/*/providers.tf.
#
#   TF_VERSION=1.15.8 sh scripts/install-terraform.sh
#
# The binary is installed into /usr/local/bin (already on PATH) when the runner
# allows it, otherwise into $PWD/.ci-bin with the directory prepended to PATH
# for the following steps of the current job.
# ---------------------------------------------------------------------------

set -eu

TF_VERSION="${TF_VERSION:-1.15.8}"

# Already installed at the right version? Nothing to do.
if command -v terraform >/dev/null 2>&1; then
  installed="$(terraform version | head -n 1 | sed -e 's/^Terraform v//' -e 's/[^0-9.].*$//')"
  if [ "${installed}" = "${TF_VERSION}" ]; then
    echo "Terraform ${TF_VERSION} is already available on PATH"
    exit 0
  fi
fi

case "$(uname -s)" in
  Linux)  tf_os="linux" ;;
  Darwin) tf_os="darwin" ;;
  *) echo "Unsupported OS: $(uname -s)" >&2; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64 | amd64) tf_arch="amd64" ;;
  aarch64 | arm64) tf_arch="arm64" ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

url="https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_${tf_os}_${tf_arch}.zip"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

echo "Downloading ${url}"
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "${url}" -o "${tmp_dir}/terraform.zip"
else
  wget -q "${url}" -O "${tmp_dir}/terraform.zip"
fi

if command -v unzip >/dev/null 2>&1; then
  unzip -o -q "${tmp_dir}/terraform.zip" -d "${tmp_dir}"
else
  python3 -c 'import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])' \
    "${tmp_dir}/terraform.zip" "${tmp_dir}"
fi
chmod +x "${tmp_dir}/terraform"

if [ -w /usr/local/bin ]; then
  install_dir="/usr/local/bin"
elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
  sudo install -m 0755 "${tmp_dir}/terraform" /usr/local/bin/terraform
  install_dir="/usr/local/bin"
else
  install_dir="${PWD}/.ci-bin"
fi

if [ "${install_dir}" != "/usr/local/bin" ]; then
  mkdir -p "${install_dir}"
  mv "${tmp_dir}/terraform" "${install_dir}/terraform"
  # Make the directory visible to the remaining steps of this job
  # (recognised by Azure Pipelines; harmless text elsewhere).
  echo "##vso[task.prependpath]${install_dir}"
  PATH="${install_dir}:${PATH}"
  export PATH
fi

echo "Installed $(terraform version | head -n 1) into ${install_dir}"
