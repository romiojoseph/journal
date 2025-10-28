import styles from '../styles/Dashboard.module.css';
import { StarFour, Circle, Square, Triangle } from "@phosphor-icons/react/dist/ssr";

export default function StatBoxes({ data }) {
    // Define colors to match your theme
    const colors = {
        Happy: 'var(--mood-happy)',
        Chill: 'var(--mood-chill)',
        Tired: 'var(--mood-tired)',
        Stress: 'var(--mood-stress)',
    };

    return (
        <div className={styles.statBoxContainer}>
            {Object.entries(data).map(([mood, count]) => (
                <div key={mood} className={styles.statBox}>
                    <span className={styles.statCount}>{count}</span>
                    <div className={styles.statLabel}>
                        <span className={styles.statIcon} style={{ color: colors[mood] }} data-mood={mood}>
                            {mood === 'Happy' && <StarFour size={16} weight="fill" />}
                            {mood === 'Chill' && <Circle size={16} weight="fill" />}
                            {mood === 'Tired' && <Square size={16} weight="fill" />}
                            {mood === 'Stress' && <Triangle size={16} weight="fill" />}
                        </span>
                        {mood}
                    </div>
                </div>
            ))}
        </div>
    );
}