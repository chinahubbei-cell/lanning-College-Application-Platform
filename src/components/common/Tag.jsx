import './Tag.css';

/**
 * Tag 组件
 * @param {'default'|'success'|'warning'|'danger'|'primary'|'secondary'} variant
 * @param {'sm'|'md'} size
 */
export default function Tag({
    children,
    variant = 'default',
    size = 'sm',
    icon,
    className = '',
}) {
    return (
        <span className={`tag tag--${variant} tag--${size} ${className}`}>
            {icon && <span className="tag__icon">{icon}</span>}
            {children}
        </span>
    );
}
