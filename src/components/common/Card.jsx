import './Card.css';

/**
 * Card 组件
 * @param {'default'|'glass'|'gradient'|'elevated'} variant
 * @param {boolean} hoverable
 * @param {boolean} glow
 */
export default function Card({
    children,
    variant = 'default',
    hoverable = false,
    glow = false,
    className = '',
    onClick,
    ...rest
}) {
    return (
        <div
            className={`card card--${variant} ${hoverable ? 'card--hoverable' : ''} ${glow ? 'card--glow' : ''} ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            {...rest}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '' }) {
    return <div className={`card__header ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
    return <div className={`card__body ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
    return <div className={`card__footer ${className}`}>{children}</div>;
}
