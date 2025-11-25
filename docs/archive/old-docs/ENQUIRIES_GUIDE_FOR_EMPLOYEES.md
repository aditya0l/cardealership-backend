# 📋 Enquiries Management Guide for Employees

## 🎯 **Overview**
This guide covers how employees (General Manager, Sales Manager, Team Lead, Customer Advisor) can manage enquiries within the dealership system. All employees work within their assigned dealership and can only see enquiries from their own dealership.

---

## 👥 **Role-Based Permissions**

### **🔵 General Manager**
- ✅ **View**: All enquiries in dealership
- ✅ **Update**: Add remarks, update status, assign to advisors
- ✅ **Create**: New enquiries
- ❌ **Delete**: Cannot delete enquiries

### **🟡 Sales Manager**
- ✅ **View**: All enquiries in dealership
- ✅ **Update**: Add remarks, update status, assign to advisors
- ✅ **Create**: New enquiries
- ❌ **Delete**: Cannot delete enquiries

### **🟢 Team Lead**
- ✅ **View**: All enquiries in dealership
- ✅ **Update**: Add remarks, update status, assign to advisors
- ✅ **Create**: New enquiries
- ❌ **Delete**: Cannot delete enquiries

### **🔴 Customer Advisor**
- ✅ **View**: All enquiries in dealership + Own created enquiries
- ✅ **Update**: Add remarks, update status
- ✅ **Create**: New enquiries
- ❌ **Delete**: Cannot delete enquiries
- ❌ **Assign**: Cannot assign enquiries to other advisors

---

## 📱 **Creating New Enquiries**

### **Step 1: Access Enquiries Page**
1. Login to the dashboard
2. Navigate to **"Enquiries"** in the sidebar
3. Click **"Add New Enquiry"** button

### **Step 2: Fill Enquiry Details**
```
📋 Required Fields:
- Customer Name: Full name of the customer
- Customer Contact: Phone number (10 digits)
- Customer Email: Valid email address
- Model: Vehicle model (e.g., "Tata Nexon", "Honda City")
- Variant: Specific variant (e.g., "XZ+ Diesel MT")

📝 Optional Fields:
- Color: Preferred color
- Source: How customer found us (Walk-in, Online, Referral, etc.)
- Expected Booking Date: When customer wants to book
- CA Remarks: Initial observations/notes
- Category: HOT, LOST, or BOOKED
- Dealer Code: Your dealer code
```

### **Step 3: Save Enquiry**
- Click **"Create Enquiry"** to save
- System automatically assigns it to your dealership
- You'll see confirmation message

---

## 📊 **Viewing Enquiries**

### **Enquiries List View**
The enquiries page shows:
- **Customer Details**: Name, contact, email
- **Vehicle Info**: Model, variant, color
- **Status**: OPEN/CLOSED
- **Category**: HOT/LOST/BOOKED
- **Assigned To**: Which advisor is handling
- **Created Date**: When enquiry was created
- **Actions**: View details, edit, add remarks

### **Filtering Options**
- **By Status**: OPEN or CLOSED
- **By Category**: HOT, LOST, or BOOKED
- **By Date**: Recent enquiries
- **By Advisor**: Who's handling the enquiry

---

## ✏️ **Updating Enquiries**

### **Adding Remarks**
1. Click **"View Details"** on any enquiry
2. Scroll to **"Remarks Section"**
3. Add your role-specific remarks:
   - **General Manager**: `generalManagerRemarks`
   - **Sales Manager**: `salesManagerRemarks`
   - **Team Lead**: `teamLeadRemarks`
   - **Customer Advisor**: `advisorRemarks`
4. Click **"Save Remarks"**

### **Updating Status**
1. Open enquiry details
2. Change **Status** dropdown:
   - **OPEN**: Active enquiry
   - **CLOSED**: Resolved/completed
3. Save changes

### **Updating Category**
1. Open enquiry details
2. Change **Category** dropdown:
   - **HOT**: High priority, likely to convert
   - **LOST**: Customer went elsewhere
   - **BOOKED**: Successfully converted to booking
3. Save changes

### **Assigning to Advisor** (GM/SM/TL only)
1. Open enquiry details
2. In **"Assigned To"** dropdown, select advisor
3. Save changes

---

## 🔍 **Search and Filter**

### **Quick Search**
- Use search bar to find by customer name
- Search by phone number
- Search by email address

### **Advanced Filters**
- **Status Filter**: Show only OPEN or CLOSED
- **Category Filter**: Show only HOT, LOST, or BOOKED
- **Date Range**: Filter by creation date
- **Advisor Filter**: Show enquiries by specific advisor

---

## 📈 **Dashboard Analytics**

### **Enquiry Statistics**
Access dashboard to see:
- **Total Enquiries**: Count of all enquiries
- **By Category**: HOT vs LOST vs BOOKED breakdown
- **By Status**: OPEN vs CLOSED count
- **Recent Activity**: Latest enquiries created
- **Conversion Rate**: How many enquiries become bookings

### **Performance Metrics**
- **Response Time**: How quickly enquiries are handled
- **Follow-up Rate**: How often you follow up with customers
- **Conversion Rate**: Enquiries that become bookings

---

## 📞 **Customer Communication**

### **Initial Contact**
When creating an enquiry:
1. **Gather Complete Info**: Name, contact, email, requirements
2. **Set Expectations**: Timeline, availability, process
3. **Document Everything**: Use remarks field for all interactions

### **Follow-up Process**
1. **Hot Enquiries**: Follow up within 24 hours
2. **Regular Enquiries**: Follow up within 48 hours
3. **Update Status**: Keep enquiry status current
4. **Add Remarks**: Document all customer interactions

### **Converting to Booking**
1. When customer confirms purchase:
   - Change category to **"BOOKED"**
   - Change status to **"CLOSED"**
   - Add final remarks about the deal
2. Create corresponding booking record
3. Update vehicle stock if applicable

---

## ⚠️ **Important Guidelines**

### **Data Privacy**
- Only access enquiries from your dealership
- Never share customer data with other dealerships
- Keep all customer information confidential

### **Quality Standards**
- **Complete Information**: Always fill required fields
- **Accurate Data**: Verify customer contact details
- **Regular Updates**: Keep enquiry status current
- **Professional Remarks**: Use professional language in remarks

### **Escalation Process**
1. **Customer Advisor**: Handle routine enquiries
2. **Team Lead**: Escalate complex cases
3. **Sales Manager**: Handle VIP customers
4. **General Manager**: Handle major deals/conflicts

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **"Enquiry Not Saving"**
- Check all required fields are filled
- Verify internet connection
- Try refreshing the page

#### **"Can't See Enquiries"**
- Ensure you're logged in with correct role
- Check if enquiry belongs to your dealership
- Contact admin if access issues persist

#### **"Can't Edit Enquiry"**
- Verify you have permission for your role
- Check if enquiry is locked by another user
- Refresh page and try again

### **Error Messages**
- **"Insufficient permissions"**: Contact admin for role access
- **"Enquiry not found"**: Check if enquiry exists in your dealership
- **"Network error"**: Check internet connection and try again

---

## 📞 **Support Contacts**

### **Technical Issues**
- **Admin**: For role/permission problems
- **IT Support**: For system/technical issues
- **Manager**: For process/workflow questions

### **Emergency Contacts**
- **System Admin**: For urgent access issues
- **Database Admin**: For data recovery needs

---

## 📚 **Best Practices**

### **Daily Routine**
1. **Morning**: Check new enquiries from overnight
2. **During Day**: Follow up on pending enquiries
3. **Evening**: Update status of handled enquiries
4. **Weekly**: Review conversion rates and performance

### **Customer Service**
1. **Respond Quickly**: Acknowledge enquiries promptly
2. **Be Professional**: Use polite, helpful language
3. **Follow Through**: Keep promises to customers
4. **Document Everything**: Record all interactions

### **Team Collaboration**
1. **Share Knowledge**: Help colleagues with difficult cases
2. **Escalate Appropriately**: Don't hesitate to ask for help
3. **Communicate**: Keep team informed of important updates
4. **Learn Continuously**: Improve skills and knowledge

---

## 🎯 **Success Metrics**

### **Key Performance Indicators (KPIs)**
- **Response Time**: < 2 hours for initial response
- **Follow-up Rate**: 100% of enquiries followed up within 48 hours
- **Conversion Rate**: Target 15-25% of enquiries to bookings
- **Customer Satisfaction**: High ratings in customer feedback

### **Monthly Goals**
- **Enquiry Volume**: Meet monthly enquiry targets
- **Quality Score**: Maintain high data quality standards
- **Team Performance**: Contribute to team goals
- **Customer Retention**: Build long-term customer relationships

---

## 🔄 **Workflow Summary**

```
📥 New Enquiry → 📝 Create Record → 📞 Initial Contact → 
📊 Follow Up → 💬 Update Status → 🎯 Convert to Booking → 
📈 Track Performance
```

---

## 📱 **Mobile Access**

### **Dashboard Mobile**
- Access via mobile browser
- Responsive design for phones/tablets
- Full functionality available on mobile

### **Offline Work**
- Create enquiry drafts offline
- Sync when connection restored
- Backup important customer data

---

*Last Updated: January 2025*
*Version: 1.0*
*For questions, contact your manager or system administrator*
