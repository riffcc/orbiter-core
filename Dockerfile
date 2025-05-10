FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    curl \
    git \
    wget \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -

RUN apt-get install -y nodejs

RUN npm install -g npm@latest

# bash
RUN wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.bashrc" SHELL="$(which bash)" bash -

RUN bash -c 'source ~/.bashrc && pnpm install -g @riffcc/orbiter'

COPY lenses /app/data/lenses

WORKDIR /app/data/lenses

EXPOSE 3000

CMD ["orb", "run", "--domain=lens.orbiter.riff.cc"]