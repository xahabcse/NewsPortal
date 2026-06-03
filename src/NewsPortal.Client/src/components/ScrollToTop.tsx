import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Resets the window scroll to the top whenever the route changes via a forward
 * navigation (clicking a link, e.g. opening a related article). Back/forward
 * navigation (POP) is left to the browser so the previous reading position is
 * restored instead of being yanked to the top.
 *
 * Renders nothing — mount it once inside <Router>.
 */
const ScrollToTop = () => {
    const { pathname } = useLocation();
    const navigationType = useNavigationType();

    useEffect(() => {
        if (navigationType !== 'POP') {
            window.scrollTo({ top: 0, left: 0 });
        }
    }, [pathname, navigationType]);

    return null;
};

export default ScrollToTop;
