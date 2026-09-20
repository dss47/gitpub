import { useState } from 'react'
import { GitHubUser, ClonedRepository } from 'src/shared/types'
import Sidebar from './components/Sidebar'
import styles from './App.module.css'

function App(): React.JSX.Element {
  const [gitVersion, setGitVersion] = useState<string>('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [isGitRepo, setIsGitRepo] = useState<boolean>(false)
  const [bearerToken, setBearerToken] = useState<string>(() => {
    return localStorage.getItem('gitpub_token') || ''
  })
  const [user, setUser] = useState<GitHubUser | null>(() => {
    const savedUsr = localStorage.getItem('gitpub_user')
    return savedUsr ? JSON.parse(savedUsr) : null
  })
  const [repoName, setRepoName] = useState<string>('')
  const [isPrivate, setIsPrivate] = useState<boolean>(false)
  const [projectUrl, setProjectUrl] = useState<string>('')
  const [cloneUrl, setCloneUrl] = useState<string>('')
  const [cloneName, setCloneName] = useState<string>('')
  const [cloneTarget, setCloneTarget] = useState<string>('')
  const [cloneError, setCloneError] = useState<string>('')


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
  const loginTokenGithub = async (e): Promise<void> => {
    e.preventDefault()
    if (bearerToken) {
      setBearerToken(bearerToken)
      const result = await window.electron.ipcRenderer.invoke('github:token-login', bearerToken)
      if (result.success) {
        setUser(result.user)
        localStorage.setItem('gitpub_token', bearerToken)
        localStorage.setItem('gitpub_user', JSON.stringify(result.user))
      }
      else alert(result.error)
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
  const loginOAuthGithub = async (): Promise<void> => {
    const result = await window.electron.ipcRenderer.invoke('github:oauth-login')
    if (result.success) {
      setBearerToken(result.token)
      setUser(result.user)
      localStorage.setItem('gitpub_token', result.token)
      localStorage.setItem('gitpub_user', JSON.stringify(result.user))
    } else {
      alert(result.error)
    }
  }


  const cloneRepo = async (e): Promise<void> => {
    e.preventDefault()
    if (!cloneUrl)
      return
    setCloneError('')
    const destination = await window.electron.ipcRenderer.invoke('dialog:open-folder')
    if (!destination)
      return

    const result = await window.electron.ipcRenderer.invoke('git:clone', cloneUrl, destination, bearerToken)
    if (result.success) {
      setCloneName(result.projectName)
      setCloneTarget(result.targetDirectory)
      setCloneError('')
    } else {
      setCloneError(result.error)
      setCloneName('')
    }

  }

  const handleLogout = (): void => {
    localStorage.removeItem('gitpub_token')
    localStorage.removeItem('gitpub_user')
    setUser(null)
    setBearerToken('')
  }

  return (
    <div className={styles.container}>
      <Sidebar/>
      <div>
        <button onClick={checkGit}>Git Version</button>
        {gitVersion && <span>{gitVersion}</span>}
        <button onClick={selectFolder}>Import Project</button>
        {selectedFolder && <span>{selectedFolder}</span>}
        {selectedFolder && (isGitRepo ? <span>Git Repository :D</span> : <span>Not a Git Repository :/</span>)}
        <form onSubmit={loginTokenGithub}>
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
      <button onClick={loginOAuthGithub}>Sign in with Github</button>
      <br />
      <form onSubmit={cloneRepo}>
        <input type="text" placeholder='Enter the URL of the project to clone...' value={cloneUrl} onChange={(e) => { setCloneUrl(e.target.value) }} />
        <button type="submit">Clone Repository</button>
      </form>
      {cloneError && (
        <span style={{ color: '#ff5555' }}>
          Failed to clone: Make sure you have access rights and that your link is valid!
        </span>
      )}

      {cloneName && (
        <span style={{ color: '#00ffcc' }}>
          Successfully cloned <strong>{cloneName}</strong> into <code>{cloneTarget}</code> !
        </span>
      )}
      <br /><br />
      <button onClick={handleLogout}>Logout</button>
    </div>
  )
}

export default App
