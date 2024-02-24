const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = 5000;
const fs = require('fs');

app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 


app.get('/', (req, res) => {
    res.send('Welcome to the backend!');
});



//-------------------COOKIES-----------------------

// app.post('/login', (req, res) => {
//     // Assuming authentication is successful
//     const userId = '123'; // Replace with actual user ID
//     // Set a cookie containing the user's ID
//     res.cookie('userId', userId, { httpOnly: true }); // httpOnly: true for added security
//     res.send('Logged in successfully');
// });

// // Route for checking if user is logged in
// app.get('/check-login', (req, res) => {
//     const userId = req.cookies.userId;
//     if (userId) {
//         res.send('User is logged in');
//     } else {
//         res.send('User is not logged in');
//     }
// });

// // Route for logging out
// app.post('/logout', (req, res) => {
//     // Clear the userId cookie
//     res.clearCookie('userId');
//     res.send('Logged out successfully');
// });

//------------------ADMIN FETCH EMPLOYEES-----------------

app.get('/admin/employees', (req, res) => {
    fs.readFile('employees.json', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).send('Internal Server Error');
        }

        const employees = JSON.parse(data);

        // Check if an ID parameter is provided in the query
        const { id } = req.query;
        if (id) {
            // Find the employee with the matching ID
            const employee = employees.find(emp => emp.id === parseInt(id));
            if (!employee) {
                return res.status(404).send('Employee not found');
            }
            return res.json({ employee });
        }

        // Send the list of all employees if no ID parameter is provided
        res.json({ employees });
    });
});


app.post('/admin/employees/addEmployee', (req, res) => {
    const employeeData = req.body;

    // Write employee data to employees.json file
    fs.readFile('employees.json', (err, data) => {
        if (err) {
            console.error('Error reading employees.json:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        const employees = JSON.parse(data);
        employees.push(employeeData);

        fs.writeFile('employees.json', JSON.stringify(employees, null, 2), err => {
            if (err) {
                console.error('Error writing to employees.json:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
        
            console.log('Employee added:', employeeData);
            res.json({ message: 'Employee added successfully' });
        });
    });
});

app.post('/admin/pending-requests/:id', (req, res) => {
    const request = req.body;
    const requestId = Date.now(); // Generate unique ID for the request
    
    
    const requestData = {
        id: requestId,
        userId: request.userId, 
        days: request.days,
        status: request.status
        
    };

    fs.readFile('requests.json', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        let requests = JSON.parse(data);
        requests.push(requestData);

        fs.writeFile('requests.json', JSON.stringify(requests, null, 2), err => {
            if (err) {
                console.error('Error writing to file:', err);
                res.status(500).send('Internal Server Error');
                return;
            }

            console.log('Request added:', requestData);
            res.json({ message: 'Request added successfully' });
        });
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Authenticate user against the data stored in employees.json
    fs.readFile('employees.json', (err, employeeData) => {
        if (err) {
            console.error('Error reading employees file:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        // Parse employee data
        const employees = JSON.parse(employeeData);
        const authenticatedEmployee = employees.find(employee => employee.email === email && employee.password === password);

        if (authenticatedEmployee) {
            // Authentication successful
            const userId = authenticatedEmployee.id; // Retrieve userID from 'id'
            
            // Generate a token
            const token = jwt.sign({ userId }, secretKey, { expiresIn: '1h' }); // Token expires in 1 hour
            
            // Set a cookie containing the token with an expiry time
            res.cookie('token', token, { httpOnly: true, maxAge: 3600000 }); // Cookie expires in 1 hour (3600000 milliseconds)
            
            // Send the token in the response
            res.json({ userId });
        } else {
            // Attempt authentication against admins.json
            fs.readFile('admins.json', (err, adminData) => {
                if (err) {
                    console.error('Error reading admins file:', err);
                    res.status(500).send('Internal Server Error');
                    return;
                }

                // Parse admin data
                const admins = JSON.parse(adminData);
                const authenticatedAdmin = admins.find(admin => admin.email === email && admin.password === password);

                if (authenticatedAdmin) {
                    // Authentication successful
                    const userId = authenticatedAdmin.id; // Retrieve userID from 'id'
                    
                    // Generate a token
                    const token = jwt.sign({ userId }, secretKey, { expiresIn: '1h' }); // Token expires in 1 hour
                    
                    // Set a cookie containing the token with an expiry time
                    res.cookie('token', token, { httpOnly: true, maxAge: 3600000 }); // Cookie expires in 1 hour (3600000 milliseconds)
                    
                    // Send the token in the response
                    res.json({ userId });
                } else {
                    // Authentication failed
                    res.status(401).send('Unauthorized');
                }
            });
        }
    });
});




// //-------------------------REQUESTS---------------------------------
app.get('/admin/pending-requests', (req, res) => {
    const { userId } = req.query;

    fs.readFile('requests.json', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        const requests = JSON.parse(data);

        // If userId is provided, filter requests based on userId
        const filteredRequests = userId ? requests.filter(request => request.userId == userId) : requests;

        res.json({ pendingRequests: filteredRequests });
    });
});

app.get('/admin/pending-requests/:id', (req, res) => {
    const requestId = req.params.id;
    console.log("Requested ID:", requestId); // Log the requested ID

    // Read the pending requests from the file or database
    fs.readFile('requests.json', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        const pendingRequests = JSON.parse(data);
        console.log("All Requests:", pendingRequests); // Log all pending requests

        // Find the request with the specified ID
        const requestedRequest = pendingRequests.find(request => request.id == requestId);

        if (!requestedRequest) {
            console.log("Request not found:", requestId); // Log if request is not found
            res.status(404).send('Request not found');
            return;
        }

        res.json(requestedRequest);
    });
});

// app.post('/employee/request', (req, res) => {
//     const request = req.body;

//     fs.readFile('pending-requests.json', (err, data) => {
//         if (err) {
//             console.error('Error reading file:', err);
//             res.status(500).send('Internal Server Error');
//             return;
//         }

//         const pendingRequests = JSON.parse(data);
//         pendingRequests.push(request);

//         fs.writeFile('pending-requests.json', JSON.stringify(pendingRequests, null, 2), err => {
//             if (err) {
//                 console.error('Error writing to file:', err);
//                 res.status(500).send('Internal Server Error');
//                 return;
//             }

//             res.json({ message: 'Holiday request added successfully' });
//         });
//     });
// });

app.delete('/admin/pending-requests/:id', (req, res) => {
    const requestId = req.params.id;

    fs.readFile('requests.json', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).send('Internal Server Error');
        }

        let pendingRequests;
        try {
            pendingRequests = JSON.parse(data);
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            return res.status(500).send('Internal Server Error');
        }

        // Filter out the request with the specified ID
        const updatedRequests = pendingRequests.filter(request => request.id !== parseInt(requestId));

        // Write the updated requests back to the file
        fs.writeFile('requests.json', JSON.stringify(updatedRequests, null, 2), writeErr => {
            if (writeErr) {
                console.error('Error writing to file:', writeErr);
                return res.status(500).send('Internal Server Error');
            }

            res.json({ message: 'Holiday request removed successfully' });
        });
    });
});

app.put('/admin/approve-request/:id', (req, res) => {
    const requestId = req.params.id;

    fs.readFile('requests.json', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).send('Internal Server Error');
        }

        let pendingRequests;
        try {
            pendingRequests = JSON.parse(data);
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            return res.status(500).send('Internal Server Error');
        }

        // Find the request with the specified ID
        const requestedRequestIndex = pendingRequests.findIndex(request => request.id == requestId);

        if (requestedRequestIndex === -1) {
            return res.status(404).send('Request not found');
        }

        // Update the status of the request to "approved"
        pendingRequests[requestedRequestIndex].status = 'approved';

        // Write the updated requests back to the file
        fs.writeFile('requests.json', JSON.stringify(pendingRequests, null, 2), writeErr => {
            if (writeErr) {
                console.error('Error writing to file:', writeErr);
                return res.status(500).send('Internal Server Error');
            }

            res.json({ message: 'Request approved successfully' });
        });
    });
});

//-------------DISABLED DAYS & APPROVED HOLIDAYS----------------
app.post('/admin/disable-days', (req, res) => {
    const selectedDays = req.body.selectedDays;
  
    // Validate selectedDays (you might want to add more validation here)
    if (!Array.isArray(selectedDays)) {
      return res.status(400).json({ error: 'Invalid selected days' });
    }
  
    // Load existing disabled days from JSON file, if it exists
    let disabledDays = [];
    try {
      disabledDays = JSON.parse(fs.readFileSync('disabled-days.json'));
    } catch (error) {
      console.error('Error loading disabled days:', error);
    }
  
    // Update disabledDays with the new selectedDays
    disabledDays = disabledDays.concat(selectedDays);
  
    // Write the updated disabled days back to the JSON file
    fs.writeFile('disabled-days.json', JSON.stringify(disabledDays), (err) => {
      if (err) {
        console.error('Error writing disabled days to file:', err);
        return res.status(500).json({ error: 'Failed to update disabled days' });
      }
      console.log('Disabled days updated successfully');
      res.json({ message: 'Disabled days updated successfully' });
    });
  });
  
  app.get('/admin/get-disabled-days', (req, res) => {
    // Load disabled days from JSON file
    let disabledDays = [];
    try {
      disabledDays = JSON.parse(fs.readFileSync('disabled-days.json'));
    } catch (error) {
      console.error('Error loading disabled days:', error);
      return res.status(500).json({ error: 'Failed to load disabled days' });
    }
  
    // Send disabled days as JSON response
    res.json({ disabledDays });
  });

  const generateSecretKey = () => {
    return crypto.randomBytes(32).toString('hex');
  };
  
  // Generate the secret key
  const secretKey = generateSecretKey();

  
// app.put('/admin/approve-request/:id', (req, res) => {
//     const requestId = req.params.id;
    
//     // Read the pending requests from the file
//     fs.readFile('pending-requests.json', (err, data) => {
//         if (err) {
//             console.error('Error reading file:', err);
//             res.status(500).send('Internal Server Error');
//             return;
//         }

//         let pendingRequests = JSON.parse(data);

//         // Find the request to be approved by ID
//         const approvedRequestIndex = pendingRequests.findIndex(request => request.id === requestId);
//         if (approvedRequestIndex === -1) {
//             res.status(404).send('Request not found');
//             return;
//         }

//         // Get the approved request
//         const approvedRequest = pendingRequests[approvedRequestIndex];

//         // Remove the request from pending requests
//         pendingRequests.splice(approvedRequestIndex, 1);

//         // Write the updated pending requests to the file
//         fs.writeFile('pending-requests.json', JSON.stringify(pendingRequests, null, 2), err => {
//             if (err) {
//                 console.error('Error writing to file:', err);
//                 res.status(500).send('Internal Server Error');
//                 return;
//             }

//             // Read approved requests from the file
//             fs.readFile('approved-requests.json', (err, data) => {
//                 if (err) {
//                     console.error('Error reading file:', err);
//                     res.status(500).send('Internal Server Error');
//                     return;
//                 }

//                 let approvedRequests = JSON.parse(data);

//                 // Add the approved request to approved requests
//                 approvedRequests.push(approvedRequest);

//                 // Write the updated approved requests to the file
//                 fs.writeFile('approved-requests.json', JSON.stringify(approvedRequests, null, 2), err => {
//                     if (err) {
//                         console.error('Error writing to file:', err);
//                         res.status(500).send('Internal Server Error');
//                         return;
//                     }

//                     console.log('Request approved and moved to approved-requests.json:', approvedRequest);
//                     res.json({ message: 'Request approved successfully' });
//                 });
//             });
//         });
//     });
// });




app.listen(process.env.PORT || PORT, () => {console.log(`Server is running on ${PORT}`)})
