import { useState } from 'react'

function App(): React.JSX.Element {
  const [gitVersion, setGitVersion] = useState<string>('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [isGitRepo, setIsGitRepo] = useState<boolean>(false)
  const [bearerToken, setBearerToken] = useState<string>('')
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [repoName, setRepoName] = useState<string>('')
  const [isPrivate, setIsPrivate] = useState<boolean>(false)
  const [projectUrl, setProjectUrl] = useState<string>('')

  const checkGit = async (): Promise<void> => {
    const version = await window.electron.ipcRenderer.invoke('git:version')
    if (version) {
      setGitVersion(version)
    }
  }
  const selectFolder = async (): Promise<void> => {
    const folder = await window.electron.ipcRenderer.invoke('dialog:open-folder')
    if (folder) {
      setSelectedFolder(folder)
      const repoStatus = await window.electron.ipcRenderer.invoke('git:is-repo', folder)
      setIsGitRepo(repoStatus)
    }
  }
  const loginGithub = async (e): Promise<void> => {
    e.preventDefault()
    if (bearerToken) {
      setBearerToken(bearerToken)
      const result = await window.electron.ipcRenderer.invoke('github:login', bearerToken)
      result.success ? setUser(result.user) : alert(result.error)
    }
  }
  const publishRepo = async (e): Promise<void> => {
    e.preventDefault()
    if (!user) {
      alert('Please login first!')
      return
    }
    if (!selectedFolder) {
      alert('Please select a folder first!')
      return
    }
    if (!repoName) {
      alert('Please fill publishing options first!')
      return
    }
    const result = await window.electron.ipcRenderer.invoke('git:publish', {
      folderPath: selectedFolder,
      repoName: repoName.trim(),
      isPrivate: isPrivate,
      token: bearerToken,
      username: user.login
    })
    result.success ? setProjectUrl(result.url) : alert(result.error)
  }

  return (
    <>

      <div>
        <button onClick={checkGit}>Git Version</button>
        {gitVersion && <span>{gitVersion}</span>}
        <button onClick={selectFolder}>Import Project</button>
        {selectedFolder && <span>{selectedFolder}</span>}
        {selectedFolder && (isGitRepo ? <span>Git Repository :D</span> : <span>Not a Git Repository :/</span>)}
        <form onSubmit={loginGithub}>
          <input type="password" placeholder='Enter Your Github Token' value={bearerToken} onChange={(e) => (setBearerToken(e.target.value))} />
          <button type="submit">Connect</button>
        </form>
        {user && <span>Welcome {user.login} !</span>}
        <br /><br /><br /><br />
        <form onSubmit={publishRepo}>
          <input type="text" placeholder='Enter repository name..' value={repoName} onChange={(e) => setRepoName(e.target.value)} />
          <div>
            <span>Select Visibility</span><br />
            <input type="radio" id="public" name="visibility" checked={!isPrivate} onChange={() => setIsPrivate(false)} /><span>Public</span>
            <input type="radio" id="private" name="visibility" checked={isPrivate} onChange={() => setIsPrivate(true)} /><span>Private</span>
          </div>
          <button type="submit">Publish</button>
        </form>
        {projectUrl && <span>Success! Visit your repository <a href={projectUrl}>here</a></span>}
      </div>
    </>
  )
}

export default App
