import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Mail, Phone, Calendar, User } from 'lucide-react';

const UserProfileDialog = ({ open, onOpenChange, user }) => {
  if (!user) return null;

  const getRoleBadge = (role) => {
    const badges = {
      'ADMIN': { variant: 'default', label: 'Administrateur', color: 'bg-purple-100 text-purple-700' },
      'TECHNICIEN': { variant: 'default', label: 'Technicien', color: 'bg-blue-100 text-blue-700' },
      'VISUALISEUR': { variant: 'secondary', label: 'Visualiseur', color: 'bg-gray-100 text-gray-700' }
    };
    const badge = badges[role] || badges['VISUALISEUR'];
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Profil utilisateur</DialogTitle>
          <DialogDescription>
            Informations détaillées de l'utilisateur
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Avatar and Name */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-3xl font-bold">
                {user.prenom[0]}{user.nom[0]}
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {user.prenom} {user.nom}
              </h3>
              <div className="mt-2">
                {getRoleBadge(user.role)}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-3">
              <Mail size={20} className="text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </div>

            {user.telephone && (
              <div className="flex items-center gap-3">
                <Phone size={20} className="text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Téléphone</p>
                  <p className="font-medium text-gray-900">{user.telephone}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <User size={20} className="text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Rôle</p>
                <p className="font-medium text-gray-900">
                  {user.role === 'ADMIN' ? 'Administrateur' : 
                   user.role === 'TECHNICIEN' ? 'Technicien' : 'Visualiseur'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Date de création</p>
                <p className="font-medium text-gray-900">
                  {user.dateCreation ? new Date(user.dateCreation).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
            </div>

            {user.derniereConnexion && (
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-indigo-600" />
                <div>
                  <p className="text-sm text-gray-600">Dernière connexion</p>
                  <p className="font-medium text-gray-900">
                    {new Date(user.derniereConnexion).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                user.statut === 'actif' ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              <div>
                <p className="text-sm text-gray-600">Statut</p>
                <p className="font-medium text-gray-900 capitalize">{user.statut || 'Actif'}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileDialog;