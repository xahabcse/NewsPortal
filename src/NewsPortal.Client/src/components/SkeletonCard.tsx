const SkeletonCard = () => {
    return (
        <div className="glass-morphism border border-glass-border rounded-xl md:rounded-2xl overflow-hidden animate-pulse flex flex-row md:flex-col">
            {/* Image — square on mobile, banner on desktop */}
            <div className="w-28 h-28 shrink-0 md:w-full md:h-48 bg-white/10 relative">
                <div className="hidden md:block absolute top-4 left-4 h-4 w-16 bg-white/20 rounded"></div>
            </div>

            {/* Content */}
            <div className="p-3 md:p-6 flex flex-col flex-1 space-y-2 md:space-y-4">
                {/* Category badge — mobile only */}
                <div className="md:hidden h-3 bg-white/10 rounded w-14"></div>

                {/* Title */}
                <div className="space-y-1.5">
                    <div className="h-4 md:h-5 bg-white/10 rounded w-full"></div>
                    <div className="h-4 md:h-5 bg-white/10 rounded w-5/6"></div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2">
                    <div className="h-3 bg-white/10 rounded w-16 md:w-20"></div>
                    <div className="w-1 h-1 rounded-full bg-white/10"></div>
                    <div className="h-3 bg-white/10 rounded w-12 md:w-16"></div>
                </div>

                {/* Summary — desktop only */}
                <div className="hidden md:block space-y-2">
                    <div className="h-4 bg-white/10 rounded w-full"></div>
                    <div className="h-4 bg-white/10 rounded w-full"></div>
                    <div className="h-4 bg-white/10 rounded w-3/4"></div>
                </div>

                {/* Read more — desktop only */}
                <div className="hidden md:block pt-2">
                    <div className="h-4 bg-white/10 rounded w-24"></div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonCard;
