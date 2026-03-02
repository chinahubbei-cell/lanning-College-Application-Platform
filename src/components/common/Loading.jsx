import './Loading.css';

export default function Loading({ text = '加载中...' }) {
    return (
        <div className="loading">
            <div className="loading__spinner">
                <div className="loading__ring"></div>
                <div className="loading__ring"></div>
                <div className="loading__ring"></div>
            </div>
            {text && <p className="loading__text">{text}</p>}
        </div>
    );
}

export function Skeleton({ width = '100%', height = '20px', radius = 'var(--radius-md)' }) {
    return (
        <div
            className="skeleton"
            style={{ width, height, borderRadius: radius }}
        />
    );
}
