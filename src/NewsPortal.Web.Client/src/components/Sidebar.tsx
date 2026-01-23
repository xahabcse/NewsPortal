
const Sidebar = () => {
    return (
        <aside className="fixed left-0 top-0 h-screen w-64 glass-morphism border-r border-glass-border p-6 flex flex-col gap-8">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center font-bold text-white">N</div>
                <span className="text-xl font-bold tracking-tight text-white">NewsPortal</span>
            </div>

            <nav className="flex flex-col gap-2">
                <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 ml-4">Main Menu</div>
                <a href="#" className="huly-sidebar-item active">
                    <span>Home</span>
                </a>
                <a href="#" className="huly-sidebar-item">
                    <div className="flex flex-col">
                        <span>Trending</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">Most popular stories</span>
                    </div>
                </a>
                <a href="#" className="huly-sidebar-item">
                    <div className="flex flex-col">
                        <span>Categories</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">Browse by topic</span>
                    </div>
                </a>
                <a href="#" className="huly-sidebar-item">
                    <div className="flex flex-col">
                        <span>Bookmarks</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">Your saved items</span>
                    </div>
                </a>
            </nav>

            <nav className="flex flex-col gap-2 mt-auto">
                <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 ml-4">Support</div>
                <a href="#" className="huly-sidebar-item">
                    <div className="flex flex-col">
                        <span>Settings</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">App preferences</span>
                    </div>
                </a>
                <a href="#" className="huly-sidebar-item">
                    <div className="flex flex-col">
                        <span>Help Center</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">FAQ & Support</span>
                    </div>
                </a>
            </nav>
        </aside>
    );
};

export default Sidebar;
