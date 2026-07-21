const PageHeader = ({ title, children }) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-brand-dark dark:text-dark-text mb-2 sm:mb-0">{title}</h1>
      <div className="flex items-center space-x-2">
        {children}
      </div>
    </div>
  );
};

export default PageHeader;
