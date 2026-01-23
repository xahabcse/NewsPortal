import React from 'react';

const Navbar = () => {
    return (
        <header className="fixed top-0 right-0 left-64 h-16 glass-morphism border-b border-glass-border z-10 flex items-center justify-between px-8">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
                <div className="relative w-full">
                    <input
                        type="text"
                        placeholder="Search news, topics, or authors..."
                        className="w-full bg-white/5 border border-glass-border rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                    />
                    <div className="absolute right-3 top-2 text-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <button className="text-secondary hover:text-white transition-colors relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full border border-background"></span>
                </button>
                <div className="flex items-center gap-3 pl-6 border-l border-glass-border">
                    <div className="text-right">
                        <div className="text-sm font-medium text-white">Guest User</div>
                        <div className="text-xs text-secondary">Pro Plan</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-purple-500 border border-glass-border flex items-center justify-center text-white font-bold">
                        G
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
