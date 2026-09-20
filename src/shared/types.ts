export interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
}

export interface PublishOptions {
  folderPath: string
  repoName: string
  isPrivate: boolean
  token: string
  username: string
}

export interface ClonedRepository {
  name: string
  target: string
}