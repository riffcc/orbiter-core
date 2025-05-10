FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    curl \
    git \
    wget \
    build-essential \
    expect \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -

RUN apt-get install -y nodejs

RUN npm install -g npm@latest

# bash
RUN wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.bashrc" SHELL="$(which bash)" bash -

RUN /bin/bash -c 'source ~/.bashrc ; pnpm install -g @riffcc/orbiter@0.2.27'

COPY lenses/.orbiter /app/data/lenses/.orbiter

COPY lenses/.env /app/data/lenses/.env

COPY Docker-install-pnpm.exp /app/Docker-install-pnpm.exp

RUN /bin/bash -c 'source ~/.bashrc ; chmod +x /app/Docker-install-pnpm.exp ; /app/Docker-install-pnpm.exp'

WORKDIR /app/data/lenses

EXPOSE 3000

ENV PATH="/root/.local/share/pnpm:$PATH"

CMD ["orb", "run", "--domain=lens.orbiter.riff.cc"]

ENTRYPOINT ["/bin/bash"]