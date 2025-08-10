import app from './app.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏥 ClinicOS server running on port ${PORT}`);
  console.log(`📱 Visit: http://localhost:${PORT}`);
});
