FROM oven/bun:1

# The Copilot CLI installer drops `copilot` into /usr/local/bin (already on PATH),
# so no custom PATH manipulation is needed.
RUN ln -s /usr/local/bin/bun /usr/local/bin/node

# Update packages
RUN apt-get update

# Install essential tools for dev and SSH port forwarding
RUN apt-get install -y \
    git \
    curl \
    wget \
    openssh-server \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*


# Install Copilot CLI (BYOK)
RUN curl -fsSL https://gh.io/copilot-install | bash