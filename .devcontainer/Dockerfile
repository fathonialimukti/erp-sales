FROM oven/bun:1

# Config Bun
ENV PATH="~/.bun/bin:${PATH}"
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

