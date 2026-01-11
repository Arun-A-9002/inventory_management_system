import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-4">
      <div className="container mx-auto px-4 text-center">
        <div className="flex flex-wrap justify-center items-center gap-2 text-sm">
          <span className="font-semibold">Powered by NUTRYAH DIGITAL HEALTH</span>
          <span>•</span>
          <span>Support: Mobile: +91 88707 87448</span>
          <span>•</span>
          <span>Email: support@nutryah.com</span>
          <span>•</span>
          <a href="http://www.nutryah.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-300">
            Website: www.nutryah.com
          </a>
          <span>•</span>
          <a href="#" className="hover:text-blue-300">Privacy Policy</a>
          <span>|</span>
          <a href="#" className="hover:text-blue-300">Terms & Conditions</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;