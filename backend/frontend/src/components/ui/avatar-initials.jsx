import React from 'react';

/**
 * Composant pour afficher les initiales d'un utilisateur dans un cercle
 */
export const AvatarInitials = ({ prenom, nom, className = "" }) => {
  const getInitials = () => {
    if (!prenom && !nom) return '?';
    const prenomInitial = prenom ? prenom[0].toUpperCase() : '';
    const nomInitial = nom ? nom[0].toUpperCase() : '';
    return `${prenomInitial}${nomInitial}`;
  };

  const getColorFromName = (name) => {
    // Générer une couleur cohérente basée sur le nom
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-teal-500',
    ];
    
    if (!name) return colors[0];
    
    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials();
  const bgColor = getColorFromName(`${prenom}${nom}`);

  return (
    <div 
      className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-semibold ${bgColor} ${className}`}
      title={`${prenom || ''} ${nom || ''}`}
    >
      {initials}
    </div>
  );
};

export default AvatarInitials;
