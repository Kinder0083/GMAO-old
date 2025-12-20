import React from "react";
import "./App.css";
import "./styles/preferences.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import { AIContextMenuProvider } from "./contexts/AIContextMenuContext";
import { AINavigationProvider } from "./contexts/AINavigationContext";

// Layout
import MainLayout from "./components/Layout/MainLayout";

// Pages
import Login from "./pages/Login";
import Inscription from "./pages/Inscription";
import Dashboard from "./pages/Dashboard";
import WorkOrders from "./pages/WorkOrders";
import Assets from "./pages/Assets";
import EquipmentDetail from "./pages/EquipmentDetail";
import Inventory from "./pages/Inventory";
import Locations from "./pages/Locations";
import PreventiveMaintenance from "./pages/PreventiveMaintenance";
import Reports from "./pages/Reports";
import People from "./pages/People";
import Planning from "./pages/Planning";
import PlanningMPrev from "./pages/PlanningMPrev";
import ValidateDemandeArret from "./pages/ValidateDemandeArret";
import Vendors from "./pages/Vendors";
import Settings from "./pages/Settings";
import SpecialSettings from "./pages/SpecialSettings";
import ImportExport from "./pages/ImportExport";
import PurchaseHistory from "./pages/PurchaseHistory";
import PurchaseRequests from "./pages/PurchaseRequests";
import PurchaseRequestDetail from "./pages/PurchaseRequestDetail";
import Updates from "./pages/Updates";
import Journal from "./pages/Journal";
import Meters from "./pages/Meters";
import InterventionRequests from "./pages/InterventionRequests";
import ImprovementRequests from "./pages/ImprovementRequests";
import Improvements from "./pages/Improvements";
import SurveillancePlan from "./pages/SurveillancePlan";
import SurveillanceRapport from "./pages/SurveillanceRapport";
import PresquAccidentList from "./pages/PresquAccidentList";
import PresquAccidentRapport from "./pages/PresquAccidentRapport";
import Documentations from "./pages/Documentations";
import SSHTerminal from "./pages/SSHTerminal";
import PoleDetails from "./pages/PoleDetails";
import BonDeTravailForm from "./pages/BonDeTravailForm";
import BonDeTravailView from "./pages/BonDeTravailView";
import AutorisationParticuliereForm from "./pages/AutorisationParticuliereForm";
import AutorisationParticuliereView from "./pages/AutorisationParticuliereView";
import Personnalisation from "./pages/Personnalisation";
import ChatLive from "./pages/ChatLive";
import MQTTPubSub from "./pages/MQTTPubSub";
import Sensors from "./pages/Sensors";
import IoTDashboard from "./pages/IoTDashboard";
import MQTTLogs from "./pages/MQTTLogs";

// Protected Route Component with Token Validation
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Vérifier silencieusement la validité du token
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    
    // Vérifier si le token est expiré
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
      // Token expiré, nettoyer et rediriger
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return <Navigate to="/login" replace />;
    }
  } catch (error) {
    // Token invalide, nettoyer et rediriger
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <PreferencesProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/validate-demande-arret" element={<ValidateDemandeArret />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AIContextMenuProvider>
                  <MainLayout />
                </AIContextMenuProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="work-orders" element={<WorkOrders />} />
            <Route path="assets" element={<Assets />} />
            <Route path="assets/:id" element={<EquipmentDetail />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="locations" element={<Locations />} />
            <Route path="preventive-maintenance" element={<PreventiveMaintenance />} />
            <Route path="reports" element={<Reports />} />
            <Route path="people" element={<People />} />
            <Route path="planning" element={<Planning />} />
            <Route path="planning-mprev" element={<PlanningMPrev />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="purchase-history" element={<PurchaseHistory />} />
            <Route path="purchase-requests" element={<PurchaseRequests />} />
            <Route path="purchase-requests/:id" element={<PurchaseRequestDetail />} />
            <Route path="import-export" element={<ImportExport />} />
            <Route path="settings" element={<Settings />} />
            <Route path="special-settings" element={<SpecialSettings />} />
            <Route path="updates" element={<Updates />} />
            <Route path="journal" element={<Journal />} />
            <Route path="meters" element={<Meters />} />
            <Route path="intervention-requests" element={<InterventionRequests />} />
            <Route path="improvement-requests" element={<ImprovementRequests />} />
            <Route path="improvements" element={<Improvements />} />
            <Route path="surveillance-plan" element={<SurveillancePlan />} />
            <Route path="surveillance-rapport" element={<SurveillanceRapport />} />
            <Route path="presqu-accident" element={<PresquAccidentList />} />
            <Route path="presqu-accident-rapport" element={<PresquAccidentRapport />} />
            <Route path="documentations" element={<Documentations />} />
            <Route path="documentations/:poleId" element={<PoleDetails />} />
            <Route path="documentations/:poleId/bon-de-travail" element={<BonDeTravailForm />} />
            <Route path="documentations/:poleId/bon-de-travail/:bonId/view" element={<BonDeTravailView />} />
            <Route path="documentations/:poleId/bon-de-travail/:bonId/edit" element={<BonDeTravailForm />} />
            <Route path="autorisations-particulieres" element={<AutorisationParticuliereView />} />
            <Route path="autorisations-particulieres/new" element={<AutorisationParticuliereForm />} />
            <Route path="autorisations-particulieres/edit/:id" element={<AutorisationParticuliereForm />} />
            <Route path="ssh" element={<SSHTerminal />} />
            <Route path="personnalisation" element={<Personnalisation />} />
            <Route path="chat-live" element={<ChatLive />} />
            <Route path="mqtt-pubsub" element={<MQTTPubSub />} />
            <Route path="sensors" element={<Sensors />} />
            <Route path="iot-dashboard" element={<IoTDashboard />} />
            <Route path="mqtt-logs" element={<MQTTLogs />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
    </PreferencesProvider>
  );
}

export default App;
