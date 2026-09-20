import styles from './Sidebar.module.css'
import gitpubLogo from '../../../../resources/icon.png'
import githubLogo from '../../../../resources/github.svg'

export default function Sidebar(): React.JSX.Element {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.githubVersion}>
                <img src={githubLogo} alt="Github" className={styles.githubLogo} />
                <span>git version</span>
            </div>
            <div className={styles.sidebar_logo}>
                <img src={gitpubLogo} alt="Gitpub" className={styles.sidebar_logo_img} />
                <span>Gitpub</span>
            </div>
            <div className={styles.sidebarOptions}>
                <a href="#">Projects</a>
                <a href="#">Clones</a>
                <a href="#">Settings</a>
                <a href="#">Managements</a>
            </div>
            <div>
                <img src="" alt="" />
            </div>
        </aside>
    )
}