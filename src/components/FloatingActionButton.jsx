import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const FloatingActionButton = () => {
  const handleClick = () => {
    toast.info('Quick actions coming soon');
  };

  return (
    <button
      className="md:hidden fixed bottom-20 right-6 z-40 bg-brand-red hover:bg-red-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
      onClick={handleClick}
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
};

export default FloatingActionButton;
